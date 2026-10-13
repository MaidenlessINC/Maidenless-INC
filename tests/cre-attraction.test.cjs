const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./cre-harness.cjs');

test('CC uses exact lore offline for all three supported cheeses and ordinary charms', () => {
    const { env, context } = harness();
    for (const cheese of ['Plotting Paneer', 'Storied Saga', 'Deus Ex Maconnais']) {
        context.cheeseKey = cheese;
        context.charmKey = 'Ultimate Power';
        const result = env.getAttractionPopulation(context);
        assert.equal(result.status, 'complete');
        assert.equal(result.rates['Romance Weaver'], 1550 / 2050);
        assert.equal(result.rates['Adventure Weaver'], 250 / 2050);
        assert.equal(result.rates['Tragedy Weaver'], 250 / 2050);
        assert.equal(result.rates['Comedy Weaver'], 0);
        assert.equal(result.rates['Suspense Weaver'], 0);
    }
    const results = env.calculateResults('Physical');
    assert.equal(results.rows.length, 3);
    assert.equal(results.rows.find(row => row.name === 'Romance Weaver').ar, '75.61%');
    assert.equal(results.rows.find(row => row.name === 'Romance Weaver').effectiveCr, '37.80%');
    assert.ok(Math.abs(results.overallCr - 0.5) < 1e-12);
    assert.equal(results.overallMinluck, 114);
});

test('invalid lore never falls back to the static even spread', () => {
    for (const mutate of [
        story => { delete story.story_content; },
        story => { story.total_story_content = 0; },
        story => { story.total_story_content = 2100; },
        story => { story.story_content[0].progress_amount = -1; },
        story => { story.story_content[0].progress_amount = NaN; },
        story => { story.story_content[0].genre_type = 'unknown'; },
        story => { story.story_content.push(story.story_content[0]); }
    ]) {
        const { env, context } = harness();
        env.attractionCache = { retrievedAt: Date.now(), data: { 'Conclusion Cliffs': {
            Postscript: { 'Plotting Paneer': { '-': {
                'Adventure Weaver': 20, 'Comedy Weaver': 20, 'Romance Weaver': 20,
                'Suspense Weaver': 20, 'Tragedy Weaver': 20
            } } }
        } } };
        mutate(env.user.quests.QuestConclusionCliffs.story);
        assert.equal(env.getAttractionPopulation(context).status, 'unavailable');
    }
    const { env, context } = harness();
    context.charmKey = 'Attraction';
    assert.equal(env.getAttractionPopulation(context).status, 'unavailable');
});

test('Fantasy Postscript and chapter-writing retain their remote populations', () => {
    const { env, context } = harness();
    env.attractionCache = { retrievedAt: Date.now(), data: { 'Conclusion Cliffs': {
        'Fantasy Postscript': { 'Plotting Paneer': { '-': { 'Ultimate Mythweaver': 100, SampleSize: 1 } } },
        'Writing Romance': { 'Plotting Paneer': { '-': { 'Ordinary': 100 } } }
    } } };
    for (const [stage, mouse] of [['Fantasy Postscript', 'Ultimate Mythweaver'], ['Writing Romance', 'Ordinary']]) {
        context.stageKey = stage;
        env.tem_data = [mouse];
        assert.equal(env.getConclusionCliffsPopulation(context), null);
        const result = env.calculateResults('Physical');
        assert.equal(result.undefinedAr, false);
        assert.equal(result.rows[0].ar, '100.00%');
    }
    context.stageKey = 'Postscript';
    context.cheeseKey = 'Gouda';
    assert.equal(env.getConclusionCliffsPopulation(context), null);
});

test('meter conflicts preserve CR/minluck and exclude remote-only mice in Labyrinth and Zokor', () => {
    for (const location of ['Labyrinth', 'Zokor']) {
        const { env, context } = harness();
        context.locationKey = env.locationName = location;
        context.stageKey = 'Boss';
        env.tem_data = ['Boss'];
        env.attractionCache = { retrievedAt: Date.now(), data: { [location]: {
            Boss: { 'Plotting Paneer': { '-': { Boss: 25, Ordinary: 75 } } }
        } } };
        const result = env.calculateResults('Physical');
        assert.equal(result.rows.length, 1);
        assert.equal(result.rows[0].name, 'Boss');
        assert.equal(result.rows[0].ar, '—');
        assert.equal(result.rows[0].cr, '50.00%');
        assert.equal(result.rows[0].minluck, 114);
        assert.equal(result.undefinedAr, true);
        assert.equal(result.undefinedCr, true);
        assert.match(result.population.reason, /Trap Effectiveness/);
    }
});

test('membership validation accepts zero-rate absences and rejects uncovered or empty meter lists', () => {
    const { env, context } = harness();
    const population = env.getAttractionPopulation(context);
    assert.equal(env.reconcileAttractionPopulation(population, env.tem_data).status, 'complete');
    assert.equal(env.reconcileAttractionPopulation(population, [...env.tem_data, 'Boss']).status, 'unavailable');
    assert.equal(env.reconcileAttractionPopulation(population, []).status, 'unavailable');
    env.tem_data = ['Boss'];
    context.reason = 'Stage not supported';
    const result = env.calculateResults('Physical');
    assert.equal(result.rows[0].name, 'Boss');
    assert.equal(result.rows[0].cr, '50.00%');
    assert.equal(result.rows[0].ar, '—');
});
