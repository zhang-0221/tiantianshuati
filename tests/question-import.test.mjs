import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const importer = fs.readFileSync(new URL('../question-import.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(importer, context);
const Q = context.QuestionImport;
const plain = value => JSON.parse(JSON.stringify(value));
const progress = () => {};

function fixture(count = 4) {
  const lines = [], items = [], answers = [];
  for (let i = 0; i < count; i++) {
    const type = i < Math.ceil(count * 0.7) ? 'single' : 'tf';
    const startLine = lines.length + 1;
    // Repeated stems in different papers must remain separate questions.
    const question = type === 'single' ? '数据库中存储的是什么？' : '数据库结构描述静态特性。';
    lines.push('试卷' + (i + 1) + ' ' + question);
    if (type === 'single') lines.push('A. 数据', 'B. 信息', 'C. 数据和联系', 'D. 文件');
    lines.push(type === 'single' ? '答案：C' : '答案：√。');
    items.push({ startLine, endLine: lines.length, type, label: '原题' + (i + 1), answerLines: [lines.length] });
    answers.push({ sourceId: 'q' + (i + 1), type, question, options: type === 'single' ? ['数据', '信息', '数据和联系', '文件'] : ['正确', '错误'], correctIndex: type === 'single' ? 2 : 0, correctIndexes: [], referenceAnswer: '', explanation: '', answerEvidence: lines.at(-1) });
  }
  return { material: lines.join('\n'), items, answers };
}

function modelFor(f, intercept) {
  let inventories = 0;
  return async (system, user) => {
    if (system.includes('逐行盘点')) {
      inventories++;
      const range = user.match(/归属范围：第(\d+)至(\d+)行/);
      const items = f.items.filter(item => item.startLine >= +range[1] && item.startLine <= +range[2]);
      return { kind: items.length ? 'questions' : 'material', items, unresolved: [], answerSections: [] };
    }
    const batch = JSON.parse(user);
    const result = { questions: batch.questions.map(item => structuredClone(f.answers.find(answer => answer.sourceId === item.sourceId))) };
    return intercept ? await intercept(result, batch) : result;
  };
}

test('100 original questions keep 70 singles, 30 judgments and repeated stems', async () => {
  const f = fixture(100);
  const session = Q.createSession(f.material);
  const result = await Q.extract(session, modelFor(f), progress);
  assert.equal(result.kind, 'questions');
  assert.equal(result.questions.length, 100);
  assert.equal(result.questions.filter(q => q.type === 'single').length, 70);
  assert.equal(result.questions.filter(q => q.type === 'tf').length, 30);
  assert.equal(result.questions.filter(q => q.type === 'multiple').length, 0);
  assert.equal(new Set(result.questions.map(q => q.sourceId)).size, 100);
  assert.equal(result.questions[0].correctIndex, 2);
  assert.equal(result.questions[99].correctIndex, 0);
});

test('independent inventory review adds a missed question before extraction', async () => {
  const f = fixture();
  let inventories = 0;
  const delegate = modelFor(f);
  const request = async (system, user) => {
    if (system.includes('逐行盘点') && ++inventories === 1) return { kind: 'questions', items: f.items.slice(0, -1), unresolved: [] };
    return delegate(system, user);
  };
  const result = await Q.extract(Q.createSession(f.material), request, progress);
  assert.equal(result.questions.length, 4);
});

test('missing and mistyped responses retry only affected source IDs', async () => {
  const f = fixture(5), calls = [];
  const request = modelFor(f, (result, batch) => {
    calls.push(batch.questions.map(q => q.sourceId));
    if (calls.length === 1) {
      result.questions = result.questions.filter(q => q.sourceId !== 'q2');
      result.questions.find(q => q.sourceId === 'q3').type = 'multiple';
    }
    return result;
  });
  const result = await Q.extract(Q.createSession(f.material), request, progress);
  assert.equal(result.questions.length, 5);
  assert.deepEqual(calls.slice(1).flat().sort(), ['q2', 'q3']);
});

test('incomplete model output is retried in smaller batches', async () => {
  const f = fixture(8), sizes = [];
  const request = modelFor(f, (result, batch) => {
    sizes.push(batch.questions.length);
    if (sizes.length === 1) throw Object.assign(new Error('output truncated'), { code: 'AI_INCOMPLETE_RESPONSE' });
    return result;
  });
  assert.equal((await Q.extract(Q.createSession(f.material), request, progress)).questions.length, 8);
  assert.deepEqual(sizes, [8, 4, 4]);
});

test('retry resumes completed batches after network failure', async () => {
  const f = fixture(30), session = Q.createSession(f.material);
  let calls = 0;
  const failing = modelFor(f, result => {
    if (++calls === 2) throw Object.assign(new Error('network unavailable'), { code: 'AI_NETWORK_ERROR' });
    return result;
  });
  await assert.rejects(Q.extract(session, failing, progress), /network unavailable/);
  assert.ok(session.completed.size > 0);
  const done = new Set(session.completed.keys()), retried = [];
  const resumed = modelFor(f, (result, batch) => {
    retried.push(...batch.questions.map(q => q.sourceId));
    return result;
  });
  assert.equal((await Q.extract(session, resumed, progress)).questions.length, 30);
  assert.ok(retried.every(id => !done.has(id)));
});

test('invalid answers, rewritten stems and omitted options cannot enter the library', () => {
  const f = fixture(), session = Q.createSession(f.material), item = { ...f.items[0], sourceId: 'q1' };
  assert.throws(() => Q.validateQuestion({ ...f.answers[0], correctIndex: 0 }, item, session), /答案标记不符/);
  assert.throws(() => Q.validateQuestion({ ...f.answers[0], question: '凭空新编的问题' }, item, session), /题干被改写/);
  assert.throws(() => Q.validateQuestion({ ...f.answers[0], options: ['数据', '信息', '文件'] }, item, session), /选项遗漏/);
  assert.throws(() => Q.validateQuestion({ ...f.answers[0], options: ['数据', '信息', '数据库模型', '文件'] }, item, session), /选项被改写/);
  assert.throws(() => Q.validateQuestion({ ...f.answers[0], options: ['信息', '数据', '数据和联系', '文件'] }, item, session), /顺序与原文不符/);
  assert.throws(() => Q.validateQuestion({ ...f.answers[0], explanation: 'AI新编解析' }, item, session), /不能编造/);
  assert.throws(() => Q.validateQuestion({ ...f.answers[0], answerEvidence: '' }, item, session), /不能标记为无答案/);
  assert.throws(() => Q.validateQuestion({ ...f.answers[0], correctIndex: 0, answerEvidence: 'A' }, item, session), /答案标记不符/);
});

test('unanswerable original question is kept without inventing a grade', async () => {
  const material = '何为数据库？\nA. 数据集合\nB. 操作系统';
  const item = { startLine: 1, endLine: 3, type: 'single', label: '无编号原题', answerLines: [] };
  const answer = { sourceId: 'q1', type: 'single', question: '何为数据库？', options: ['数据集合', '操作系统'], correctIndex: null, correctIndexes: [], answerEvidence: '', explanation: '' };
  const result = await Q.extract(Q.createSession(material), modelFor({ material, items: [item], answers: [answer] }), progress);
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].correctIndex, null);
  assert.equal(result.questions[0].answerStatus, 'missing');
});

test('unnumbered, inline options and more than four options need no fixed template', async () => {
  const material = '选择正确描述： A. 苹果 B. 香蕉 C. 桃子 D. 李子 E. 梨 F. 葡萄\n参考答案：F';
  const item = { startLine: 1, endLine: 2, type: 'single', label: '无编号选择', answerLines: [2] };
  const answer = { sourceId: 'q1', type: 'single', question: '选择正确描述：', options: ['苹果', '香蕉', '桃子', '李子', '梨', '葡萄'], correctIndex: 5, correctIndexes: [], answerEvidence: '参考答案：F' };
  const result = await Q.extract(Q.createSession(material), modelFor({ material, items: [item], answers: [answer] }), progress);
  assert.equal(result.questions[0].options.length, 6);
  assert.equal(result.questions[0].correctIndex, 5);
});

test('inline answer can be cleared without rewriting the statement', () => {
  const material = '数据库存储的是（C）。\nA. 数据\nB. 信息\nC. 数据和联系';
  const item = { sourceId: 'q1', startLine: 1, endLine: 4, type: 'single', label: '内嵌答案', answerLines: [] };
  const answer = { sourceId: 'q1', type: 'single', question: '数据库存储的是（）。', options: ['数据', '信息', '数据和联系'], correctIndex: 2, correctIndexes: [], answerEvidence: 'C' };
  assert.equal(Q.validateQuestion(answer, item, Q.createSession(material)).correctIndex, 2);
});

test('central answer key in a later window is available to earlier question review', async () => {
  const lines = ['请选出水果。', 'A. 苹果', 'B. 桌子', ...Array(200).fill('这是用于测试跨段上下文的讲义正文。'.repeat(6)), '集中答案', '1. A'];
  const session = Q.createSession(lines.join('\n'));
  const windows = Q.getWindows(session.lines);
  assert.ok(windows.length > 1);
  let reviewSeen = false;
  const request = async (_system, user) => {
    const range = user.match(/归属范围：第(\d+)至(\d+)行/);
    const first = +range[1] === 1;
    if (user.includes('第一次盘点结果如下')) {
      assert.ok(user.includes('1. A'));
      reviewSeen = true;
    }
    const keyInRange = lines.length >= +range[1] && lines.length <= +range[2];
    return { kind: first ? 'questions' : 'material', items: first ? [{ startLine: 1, endLine: 3, type: 'single', label: '水果题', answerLines: user.includes('第一次盘点结果如下') ? [lines.length] : [] }] : [], answerSections: keyInRange ? [{ startLine: lines.length - 1, endLine: lines.length }] : [], unresolved: [] };
  };
  const items = await Q.discover(session, request, progress);
  assert.equal(reviewSeen, true);
  assert.deepEqual(plain(items[0].answerLines), [lines.length]);
});

test('pure material follows the existing generation path', async () => {
  const session = Q.createSession('数据库是数据的集合，用于组织、存储和管理数据。');
  let calls = 0;
  const result = await Q.extract(session, async () => { calls++; return { kind: 'material', items: [], unresolved: [] }; }, progress);
  assert.equal(result.kind, 'material');
  assert.equal(calls, 1);
});

test('invalid inventory cannot silently convert recognized exam questions to material', async () => {
  const session = Q.createSession('原文包含一道明确的题，模型却没有返回任何位置。');
  await assert.rejects(Q.extract(session, async () => ({ kind: 'questions', items: [], unresolved: [] }), progress), /未返回题目清单/);
});

test('source text survives wrapping of arbitrarily long unformatted lines', () => {
  const text = '无换行长文本'.repeat(1000);
  const session = Q.createSession(text);
  assert.equal(session.lines.join(''), text);
  assert.ok(session.lines.every(line => line.length <= 1200));
});

test('dense document inventory automatically splits after output truncation', async () => {
  const f = fixture(30), session = Q.createSession(f.material);
  const delegate = modelFor(f);
  let truncated = false;
  const request = async (system, user) => {
    if (!truncated && system.includes('逐行盘点')) {
      truncated = true;
      throw Object.assign(new Error('truncated inventory'), { code: 'AI_INCOMPLETE_RESPONSE' });
    }
    return delegate(system, user);
  };
  assert.equal((await Q.extract(session, request, progress)).questions.length, 30);
  assert.ok(session.ranges.length > 1);
});

test('multiple-choice and written originals preserve their original answers', async () => {
  const material = '哪些是水果？\nA. 苹果\nB. 桌子\nC. 梨\n答案：A、C\n请简述数据库的作用。\n参考答案：组织和存储数据。';
  const items = [{ startLine: 1, endLine: 5, type: 'multiple', label: '多选', answerLines: [5] }, { startLine: 6, endLine: 7, type: 'short', label: '简答', answerLines: [7] }];
  const answers = [{ sourceId: 'q1', type: 'multiple', question: '哪些是水果？', options: ['苹果', '桌子', '梨'], correctIndex: null, correctIndexes: [0, 2], answerEvidence: '答案：A、C' }, { sourceId: 'q2', type: 'short', question: '请简述数据库的作用。', options: [], referenceAnswer: '组织和存储数据。', answerEvidence: '参考答案：组织和存储数据。' }];
  const result = await Q.extract(Q.createSession(material), modelFor({ material, items, answers }), progress);
  assert.deepEqual(plain(result.questions[0].correctIndexes), [0, 2]);
  assert.equal(result.questions[1].referenceAnswer, '组织和存储数据。');
});

test('multiple questions sharing one line are separated using model-selected anchors', async () => {
  const material = '1. 哪个是水果？ A. 苹果 B. 桌子 答案：A 2. 数据库结构描述静态特性。答案：√';
  const items = [{ startLine: 1, endLine: 1, startAnchor: '1. 哪个是水果？', type: 'single', label: '题1', answerLines: [] }, { startLine: 1, endLine: 1, startAnchor: '2. 数据库结构描述静态特性。', type: 'tf', label: '题2', answerLines: [] }];
  const answers = [{ sourceId: 'q1', type: 'single', question: '哪个是水果？', options: ['苹果', '桌子'], correctIndex: 0, correctIndexes: [], answerEvidence: '答案：A' }, { sourceId: 'q2', type: 'tf', question: '数据库结构描述静态特性。', options: ['正确', '错误'], correctIndex: 0, correctIndexes: [], answerEvidence: '答案：√' }];
  const session = Q.createSession(material);
  const result = await Q.extract(session, modelFor({ material, items, answers }), progress);
  assert.equal(result.questions.length, 2);
  assert.ok(!Q.getSource(session, session.items[0]).body.includes('2. 数据库'));
  assert.ok(!Q.getSource(session, session.items[1]).body.includes('苹果'));
});
