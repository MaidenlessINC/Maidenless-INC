
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');


const source = fs.readFileSync(path.join(__dirname, '..', 'MH_-_Minluck__CRE_tool_v2.0_new.user.js'), 'utf8');
function section(start, end) {
    const first = source.indexOf(start);
    const last = source.indexOf(end, first);
    if (first < 0 || last < 0) throw new Error(`Userscript function boundary missing: ${start} / ${end}`);
    return source.slice(first, last);
}
const storyFixture = () => ({
    is_writing: true, is_postscript: true, total_story_content: 2050,
    current_chapter: { genre_type: 'romance' },
    story_content: [
        { genre_type: 'romance', progress_amount: 1550 },
        { genre_type: 'adventure', progress_amount: 250 },
        { genre_type: 'tragedy', progress_amount: 250 }
    ]
});
const contextFixture = () => ({ locationKey: 'Conclusion Cliffs', stageKey: 'Postscript',
    cheeseKey: 'Plotting Paneer', charmKey: '-', reason: '' });

function harness() {
    const context = contextFixture();
    const env = vm.createContext({
        user: { quests: { QuestConclusionCliffs: { story: storyFixture() } }, trap_attraction_bonus: 0 },
        locationName: 'Conclusion Cliffs', weaponName: '', basicTrapArBonus: 0,
        attractionCache: undefined, attractionLoadPromise: null, attractionLoadError: '',
        attractionCharmDataset: undefined, attractionCharmKeys: undefined,
        AR_CACHE_TTL_MS: 48 * 60 * 60 * 1000,
        readAttractionCache() {}, logger() {}, getArInfo: () => ({ Invalid: 1 }),
        resolveHuntContext: () => context,
        tem_data: ['Romance Weaver', 'Adventure Weaver', 'Tragedy Weaver'],
        allType: ['Physical'], adjustedTrapLuck: 123,
        allMiceInfo: Object.fromEntries(['Romance Weaver', 'Adventure Weaver', 'Tragedy Weaver',
            'Comedy Weaver', 'Suspense Weaver', 'Ultimate Mythweaver', 'Boss', 'Ordinary'].map(name => [name, { power: 100, effs: [100] }])),
        calculateCR: () => 0.5, mouseMinluck: () => 114,
        convertDoubleToPercentage: value => (value * 100).toFixed(2) + '%',
        convertCRToPercentage: value => (value * 100).toFixed(2) + '%'
    });
    vm.runInContext(section('function resolveTsituStage', 'function isRecord'), env);
    vm.runInContext(section('function getSourceCheeseAttraction', 'const addStyles ='), env);
    vm.runInContext(section('function calculateResults', 'function renderBox'), env);
    return { env, context };
}


module.exports = { harness };
