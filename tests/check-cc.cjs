// Run directly: node tests/check-cc.cjs
const assert = require('node:assert/strict');
const { harness } = require('./cre-harness.cjs');

let passed = 0;
let failed = 0;
const percent = value => (value * 100).toFixed(2) + '%';
const cheeses = ['Plotting Paneer', 'Storied Saga', 'Deus Ex Maconnais'];
const genres = [
    { type: 'adventure', mouse: 'Adventure Weaver', chapterMouse: 'Indigo Montana' },
    { type: 'comedy', mouse: 'Comedy Weaver', chapterMouse: 'Lady Breakwell' },
    { type: 'romance', mouse: 'Romance Weaver', chapterMouse: 'Lisa Doolots' },
    { type: 'suspense', mouse: 'Suspense Weaver', chapterMouse: 'Nancy Sketched' },
    { type: 'tragedy', mouse: 'Tragedy Weaver', chapterMouse: 'Billy Lowfellow' }
];

function setStory(env, amounts) {
    const story = env.user.quests.QuestConclusionCliffs.story;
    story.total_story_content = amounts.reduce((sum, amount) => sum + amount, 0);
    story.story_content = genres.flatMap((genre, i) => amounts[i] ?
        [{ genre_type: genre.type, progress_amount: amounts[i] }] : []);
    env.tem_data = genres.filter((genre, i) => amounts[i] > 0).map(genre => genre.mouse);
}

function equal(label, actual, expected) {
    console.log(`  ${label}: expected ${JSON.stringify(expected)} | actual ${JSON.stringify(actual)}`);
    assert.equal(actual, expected, label);
}

function check(name, run) {
    console.log(`\nCASE ${passed + failed + 1}: ${name}`);
    try {
        run();
        passed++;
        console.log('  PASS');
    } catch (error) {
        failed++;
        console.log(`  FAIL: ${error.message}`);
    }
}

function cachePopulation(env, context, rates) {
    env.attractionCache = { retrievedAt: Date.now(), data: { 'Conclusion Cliffs': {
        [context.stageKey]: { [context.cheeseKey]: { '-': rates } }
    } } };
}

function verifyRates(env, context, expected) {
    const population = env.getAttractionPopulation(context);
    equal('Population status', population.status, 'complete');
    console.log(`  Source: ${population.source}`);
    console.table(Object.entries(expected).map(([name, rate]) => ({
        Mouse: name, 'Expected AR': percent(rate), 'Actual AR': percent(population.rates[name]),
        'In Trap Effectiveness': env.tem_data.includes(name)
    })));
    for (const [name, rate] of Object.entries(expected)) {
        assert.ok(Math.abs(population.rates[name] - rate) < 1e-12, `${name}: exact AR differs`);
    }
    const total = Object.values(population.rates).reduce((sum, rate) => sum + rate, 0);
    equal('Total AR', percent(total), '100.00%');
    return env.calculateResults('Physical');
}

console.log('Conclusion Cliffs detailed checks');
console.log('Runs actual userscript AR, stage detection, and row-calculation functions in an offline sandbox.');
console.log('Trap Effectiveness and source tables are fixtures; CR is fixed at 50% and minluck at 114.');
console.log('This verifies lore weighting and display logic; it does not verify live game data or the CR formula.');

for (const cheese of cheeses) {
    check(`Supplied story, offline, ${cheese}`, () => {
        const { env, context } = harness();
        context.cheeseKey = cheese;
        console.log('  Lore: Romance 1550 + Adventure 250 + Tragedy 250 = 2050');
        equal('Detected stage', env.resolveTsituStage(env.user, 'Conclusion Cliffs', '', cheese), 'Postscript');
        const result = verifyRates(env, context, {
            'Romance Weaver': 1550 / 2050, 'Adventure Weaver': 250 / 2050,
            'Tragedy Weaver': 250 / 2050, 'Comedy Weaver': 0, 'Suspense Weaver': 0
        });
        console.table(result.rows.map(row => ({ Mouse: row.name, AR: row.ar, CR: row.cr,
            'Effective CR': row.effectiveCr, Minluck: row.minluck })));
        equal('Displayed mice', [...result.rows.map(row => row.name)].sort().join(', '),
            [...env.tem_data].sort().join(', '));
        equal('Romance effective CR', result.rows.find(row => row.name === 'Romance Weaver').effectiveCr, '37.80%');
        equal('Overall effective CR', percent(result.overallCr), '50.00%');
        equal('Overall minluck', result.overallMinluck, 114);
        equal('AR available', !result.undefinedAr, true);
    });
}

// Every genre gets the same single-genre and mixed-genre cases for every cheese.
// Rotate 60/30/10/0/0: each genre is dominant once, supporting twice, absent twice.
for (const cheese of cheeses) {
    for (const [index, genre] of genres.entries()) {
        check(`Single-genre ${genre.type}, story change, ${cheese}`, () => {
            const { env, context } = harness();
            context.cheeseKey = cheese;
            setStory(env, [100, 100, 100, 100, 100]);
            env.getAttractionPopulation(context);
            setStory(env, genres.map((item, i) => i === index ? 300 : 0));
            context.charmKey = 'Ultimate Power';
            const expected = Object.fromEntries(genres.map((item, i) => [item.mouse, i === index ? 1 : 0]));
            const result = verifyRates(env, context, expected);
            equal('Displayed mouse', result.rows[0].name, genre.mouse);
            equal('Row count', result.rows.length, 1);
            equal('Effective CR', result.rows[0].effectiveCr, '50.00%');
            equal('Overall effective CR', percent(result.overallCr), '50.00%');
            equal('AR available', !result.undefinedAr, true);
        });

        check(`Mixed genres with ${genre.type} dominant, ${cheese}`, () => {
            const { env, context } = harness();
            context.cheeseKey = cheese;
            const profile = [0.6, 0.3, 0.1, 0, 0];
            const expected = Object.fromEntries(genres.map((item, i) =>
                [item.mouse, profile[(i - index + genres.length) % genres.length]]));
            setStory(env, genres.map(item => expected[item.mouse] * 1000));
            // Reverse input order to ensure genre mapping does not depend on position.
            env.user.quests.QuestConclusionCliffs.story.story_content.reverse();
            console.log('  Rotated lore: 600 / 300 / 100; two genres absent');
            const result = verifyRates(env, context, expected);
            equal('Row count', result.rows.length, 3);
            equal('Displayed mice', [...result.rows.map(row => row.name)].sort().join(', '),
                [...env.tem_data].sort().join(', '));
            for (const row of result.rows) {
                equal(`${row.name} effective CR`, row.effectiveCr, percent(expected[row.name] * 0.5));
            }
            equal('Overall effective CR', percent(result.overallCr), '50.00%');
            equal('AR available', !result.undefinedAr, true);
        });
    }
}

for (const [name, mutate] of [
    ['Missing story content', story => { delete story.story_content; }],
    ['Zero total lore', story => { story.total_story_content = 0; }],
    ['Lore total mismatch', story => { story.total_story_content = 2100; }],
    ['Negative lore amount', story => { story.story_content[0].progress_amount = -1; }],
    ['Non-finite lore amount', story => { story.story_content[0].progress_amount = NaN; }],
    ['Unknown genre', story => { story.story_content[0].genre_type = 'unknown'; }],
    ['Duplicate genre', story => { story.story_content.push(story.story_content[0]); }]
]) {
    check(`${name}: reject the cached even-spread fallback`, () => {
        const { env, context } = harness();
        setStory(env, [100, 100, 100, 100, 100]);
        cachePopulation(env, context, { 'Adventure Weaver': 20, 'Comedy Weaver': 20,
            'Romance Weaver': 20, 'Suspense Weaver': 20, 'Tragedy Weaver': 20 });
        mutate(env.user.quests.QuestConclusionCliffs.story);
        const result = env.calculateResults('Physical');
        equal('Population status', result.population.status, 'unavailable');
        console.log(`  Reason: ${result.population.reason}`);
        equal('All displayed AR values unknown', result.rows.every(row => row.ar === '—'), true);
        equal('All displayed CR values retained', result.rows.every(row => row.cr === '50.00%'), true);
        equal('All displayed minluck values retained', result.rows.every(row => row.minluck === 114), true);
        equal('Overall effective CR unavailable', result.undefinedCr, true);
    });
}

check('Attraction-changing charm is rejected', () => {
    const { env, context } = harness();
    context.charmKey = 'Attraction';
    const result = env.getAttractionPopulation(context);
    equal('Population status', result.status, 'unavailable');
    console.log(`  Reason: ${result.reason}`);
    assert.match(result.reason, /attraction-changing charms/);
});

check('Fantasy Postscript retains 100% Ultimate Mythweaver', () => {
    const { env, context } = harness();
    const story = env.user.quests.QuestConclusionCliffs.story;
    story.story_content.push({ genre_type: 'fantasy', progress_amount: 100 });
    story.total_story_content += 100;
    context.stageKey = env.resolveTsituStage(env.user, 'Conclusion Cliffs', '', context.cheeseKey);
    equal('Detected stage', context.stageKey, 'Fantasy Postscript');
    env.tem_data = ['Ultimate Mythweaver'];
    cachePopulation(env, context, { 'Ultimate Mythweaver': 100, SampleSize: 1 });
    equal('Ordinary lore override skipped', env.getConclusionCliffsPopulation(context), null);
    const result = verifyRates(env, context, { 'Ultimate Mythweaver': 1 });
    equal('Displayed mouse', result.rows[0].name, 'Ultimate Mythweaver');
});

for (const genre of genres) {
    check(`${genre.type} chapter-writing retains the source population`, () => {
        const { env, context } = harness();
        const story = env.user.quests.QuestConclusionCliffs.story;
        story.is_postscript = false;
        story.current_chapter.genre_type = genre.type;
        context.stageKey = env.resolveTsituStage(env.user, 'Conclusion Cliffs', '', context.cheeseKey);
        equal('Detected stage', context.stageKey, 'Writing ' + genre.type[0].toUpperCase() + genre.type.slice(1));
        cachePopulation(env, context, { [genre.chapterMouse]: 100 });
        equal('Ordinary lore override skipped', env.getConclusionCliffsPopulation(context), null);
        const population = env.getAttractionPopulation(context);
        equal('Source', population.source, 'Tsitu');
        equal(`${genre.chapterMouse} AR`, percent(population.rates[genre.chapterMouse]), '100.00%');
    });
}

check('Not Writing and unsupported cheese skip the lore override', () => {
    const { env, context } = harness();
    env.user.quests.QuestConclusionCliffs.story.is_writing = false;
    context.stageKey = env.resolveTsituStage(env.user, 'Conclusion Cliffs', '', context.cheeseKey);
    equal('Detected stage', context.stageKey, 'Not Writing');
    equal('Ordinary lore override skipped', env.getConclusionCliffsPopulation(context), null);
    context.stageKey = 'Postscript';
    context.cheeseKey = 'Gouda';
    equal('Unsupported cheese skips override', env.getConclusionCliffsPopulation(context), null);
});

for (const [name, mice] of [
    ['Positive-rate Weaver missing from meter', ['Romance Weaver']],
    ['Meter contains an uncovered mouse', ['Romance Weaver', 'Adventure Weaver', 'Tragedy Weaver', 'Ultimate Mythweaver']],
    ['Empty meter', []]
]) {
    check(`CC Trap Effectiveness conflict: ${name}`, () => {
        const { env } = harness();
        env.tem_data = mice;
        const result = env.calculateResults('Physical');
        equal('Population status', result.population.status, 'unavailable');
        console.log(`  Reason: ${result.population.reason}`);
        equal('Displayed mice', [...result.rows.map(row => row.name)].sort().join(', '), [...mice].sort().join(', '));
        equal('All displayed AR values unknown', result.rows.every(row => row.ar === '—'), true);
        equal('Overall effective CR unavailable', result.undefinedCr, true);
    });
}

console.log(`\nCC checks complete: ${passed} passed, ${failed} failed.`);
console.log('Balanced matrix per genre: 3 single-genre cases, 3 dominant mixed cases, 6 supporting mixed cases, 6 absent mixed cases, 1 chapter-writing case.');
process.exitCode = failed ? 1 : 0;
