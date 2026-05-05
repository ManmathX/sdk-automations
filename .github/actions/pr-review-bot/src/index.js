const core = require('@actions/core');
const github = require('@actions/github');
const { runReviewBot } = require('./review-bot');

function parseList(inputStr) {
    if (!inputStr) return [];
    return inputStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

async function run() {
    try {
        const token = core.getInput('github-token', { required: true });
        
        const teams = {
            junior: parseList(core.getInput('junior-reviewers')),
            committer: parseList(core.getInput('committer-reviewers')),
            maintainer: parseList(core.getInput('maintainer-reviewers')),
        };

        const octokit = github.getOctokit(token);
        
        core.info(`Starting PR Review Bot for ${github.context.repo.owner}/${github.context.repo.repo}`);
        
        await runReviewBot(octokit, github.context, teams);
        
        core.info('PR Review Bot completed successfully.');
    } catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

run();
