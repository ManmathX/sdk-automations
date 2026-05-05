const core = require('@actions/core');

async function runReviewBot(octokit, context, teams) {
    const { owner, repo } = context.repo;
    
    // 1. Rate limit guard
    const { data: rateLimit } = await octokit.rest.rateLimit.get();
    if (rateLimit.rate.remaining < 200) {
        core.warning('Rate limit too low, skipping run to prevent partial updates.');
        return;
    }

    core.info('Fetching open PRs...');
    // Fetch all open PRs
    const prs = await octokit.paginate(octokit.rest.pulls.list, {
        owner, repo, state: 'open'
    });

    core.info(`Found ${prs.length} open PRs. Computing workloads...`);
    const workload = computeWorkload(prs, teams);
    
    for (const pr of prs) {
        if (pr.draft) continue;
        try {
            await processPR(octokit, owner, repo, pr, teams, workload);
        } catch (error) {
            core.error(`Error processing PR #${pr.number}: ${error.message}`);
        }
    }
}

function computeWorkload(prs, teams) {
    const workload = {};
    const allMembers = [...teams.junior, ...teams.committer, ...teams.maintainer];
    allMembers.forEach(m => workload[m] = 0);
    
    for (const pr of prs) {
        if (pr.assignees) {
            for (const assignee of pr.assignees) {
                if (workload[assignee.login] !== undefined) {
                    workload[assignee.login]++;
                }
            }
        }
    }
    return workload;
}

async function getDifficulty(octokit, owner, repo, prBody) {
    if (!prBody) return 'advanced';
    const match = prBody.match(/(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+#(\d+)/i);
    if (!match) return 'advanced';
    
    const issueNum = parseInt(match[1], 10);
    try {
        const issue = await octokit.rest.issues.get({ owner, repo, issue_number: issueNum });
        const labels = issue.data.labels.map(l => typeof l === 'string' ? l : l.name);
        
        if (labels.some(l => l.toLowerCase() === 'good first issue' || l.toLowerCase() === 'skill: beginner')) {
            return 'beginner';
        }
        if (labels.some(l => l.toLowerCase() === 'skill: intermediate')) {
            return 'intermediate';
        }
        return 'advanced';
    } catch (e) {
        core.info(`Could not fetch issue #${issueNum}: ${e.message}`);
        return 'advanced';
    }
}

async function processPR(octokit, owner, repo, pr, teams, workload) {
    core.info(`Processing PR #${pr.number}...`);
    const difficulty = await getDifficulty(octokit, owner, repo, pr.body);
    
    const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
        owner, repo, pull_number: pr.number
    });
    
    const latestReviews = {};
    for (const r of reviews) {
        if (r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED') {
            latestReviews[r.user.login] = r.state;
        }
    }
    
    let juniorApprovals = 0;
    let writeApprovals = 0;
    
    for (const [user, state] of Object.entries(latestReviews)) {
        if (state === 'APPROVED') {
            if (teams.maintainer.includes(user) || teams.committer.includes(user)) {
                writeApprovals++;
            } else if (teams.junior.includes(user)) {
                juniorApprovals++;
            } else {
               try {
                   const { data: perm } = await octokit.rest.repos.getCollaboratorPermissionLevel({ owner, repo, username: user });
                   if (perm.permission === 'write' || perm.permission === 'admin') {
                       writeApprovals++;
                   }
               } catch (e) {} // ignore 404
            }
        }
    }
    
    let targetLabel = '';
    let assignTeam = [];
    
    if (difficulty === 'advanced') {
        if (writeApprovals >= 2) {
            targetLabel = 'ready-to-merge';
            assignTeam = teams.maintainer;
        } else {
            targetLabel = 'queue:committers';
            assignTeam = teams.committer.length ? teams.committer : teams.maintainer;
        }
    } else {
        if (writeApprovals >= 2) {
            targetLabel = 'ready-to-merge';
            assignTeam = teams.maintainer;
        } else if (juniorApprovals >= 1 || writeApprovals >= 1) {
            targetLabel = 'queue:committers';
            assignTeam = teams.committer;
        } else {
            targetLabel = 'queue:junior-committer';
            assignTeam = teams.junior;
            
            const daysSinceUpdate = (new Date() - new Date(pr.updated_at)) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate >= 5) {
                core.info(`PR #${pr.number} escalating to committers due to 5 days inactivity.`);
                targetLabel = 'queue:committers';
                assignTeam = teams.committer;
            }
        }
    }
    
    if (assignTeam.length === 0) assignTeam = teams.maintainer;
    if (assignTeam.length === 0) assignTeam = teams.committer; // fallback
    
    await updateLabelsAndAssignees(octokit, owner, repo, pr, targetLabel, assignTeam, workload, teams);
}

async function updateLabelsAndAssignees(octokit, owner, repo, pr, targetLabel, assignTeam, workload, teams) {
    const queueLabels = ['queue:junior-committer', 'queue:committers', 'ready-to-merge'];
    const currentLabels = pr.labels.map(l => l.name);
    
    let labelChanged = !currentLabels.includes(targetLabel);
    
    if (!labelChanged) {
        const extras = currentLabels.filter(l => queueLabels.includes(l) && l !== targetLabel);
        if (extras.length > 0) labelChanged = true;
    }
    
    if (labelChanged) {
        core.info(`PR #${pr.number}: Updating label to ${targetLabel}`);
        
        // 1. Add new label first
        await octokit.rest.issues.addLabels({
            owner, repo, issue_number: pr.number, labels: [targetLabel]
        });
        
        // 2. Remove old queue labels
        for (const l of currentLabels) {
            if (queueLabels.includes(l) && l !== targetLabel) {
                await octokit.rest.issues.removeLabel({
                    owner, repo, issue_number: pr.number, name: l
                }).catch(() => {});
            }
        }
        
        // 3. Reassign
        const author = pr.user.login;
        let bestAssignee = null;
        let minLoad = Infinity;
        
        for (const member of assignTeam) {
            if (member === author) continue;
            const load = workload[member] || 0;
            if (load < minLoad) {
                minLoad = load;
                bestAssignee = member;
            }
        }
        
        if (bestAssignee) {
            const currentlyAssigned = pr.assignees.map(a => a.login);
            if (!currentlyAssigned.includes(bestAssignee)) {
                core.info(`PR #${pr.number}: Assigning ${bestAssignee}`);
                await octokit.rest.issues.addAssignees({
                    owner, repo, issue_number: pr.number, assignees: [bestAssignee]
                });
                workload[bestAssignee]++;
                
                let msg = '';
                if (targetLabel === 'queue:junior-committer') {
                    msg = `@${bestAssignee} assigned for soft quality check.`;
                } else if (targetLabel === 'queue:committers') {
                    msg = `@${bestAssignee} assigned for committer review.`;
                } else if (targetLabel === 'ready-to-merge') {
                    msg = `@${bestAssignee} 2 approvals secured, please verify and merge.`;
                }
                
                // Unassign previous reviewers from our managed pools
                const toRemove = currentlyAssigned.filter(a => 
                    (teams.junior.includes(a) || teams.committer.includes(a) || teams.maintainer.includes(a)) 
                    && a !== bestAssignee
                );
                
                if (toRemove.length > 0) {
                    await octokit.rest.issues.removeAssignees({
                        owner, repo, issue_number: pr.number, assignees: toRemove
                    });
                }
                
                await octokit.rest.issues.createComment({
                    owner, repo, issue_number: pr.number, body: msg
                });
            }
        }
    }
}

module.exports = { runReviewBot };
