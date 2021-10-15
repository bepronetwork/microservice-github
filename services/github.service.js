const Octokit = require('octokit').Octokit;
const githubConfig = require('../config/github.config');
const octokit = new Octokit({ auth: githubConfig.githubToken });

const ownerRepo = {owner: githubConfig.githubOwner, repo: githubConfig.githubRepo,}
const ownerRepoPath = `${ownerRepo.owner}/${ownerRepo.repo}`;
const mapData = ({data}) => data;
//                      hrs * min * sec * ms
const GITHUB_STATS_TTL = 24 * 60 * 60 * 1000

const githubRepoStats = {
  lastUpdated: 0,
  data: {},
}

const githubForkStats = {
  lastUpdated: 0,
  data: {},
}

function getOwnerRepo(repoPath) {
  const [owner, repo] = (repoPath || ownerRepoPath).split(`/`);
  return ({owner, repo});
}

module.exports = class GithubService {

  static async createIssue(title, description, repoPath) {
    // Create issue
    const data = await octokit.rest.issues.create({
      ...getOwnerRepo(repoPath),
      title,
      body: description,
      labels: ['draft']
    });

    return data.data;
  }

  static async closeIssue(issueId, repoPath) {
    // Close issue
    const data = await octokit.rest.issues.update({
      ...getOwnerRepo(repoPath),
      issue_number: issueId,
      state: 'closed',
    });

    return data.data;
  }

  static async removeDraftLabelFromIssue(issueId, repoPath) {
    // Remove Draft label from issue
    const data = await octokit.rest.issues.removeLabel({
      ...getOwnerRepo(repoPath),
      issue_number: issueId,
      name: 'draft'
    });

    return data.data;
  }

  static async getIssueById(issueId, repoPath) {
    // Get issue by id
    const data = await octokit.rest.issues.get({
      ...getOwnerRepo(repoPath),
      issue_number: issueId,
    });

    return data.data
  }

  static async getIssueComments(issueId, repoPath) {
    // Get Issue comments
    const data = await octokit.rest.issues.listComments({
      ...getOwnerRepo(repoPath),
      issue_number: issueId,
    });

    return data.data
  }

  static async getIssueForks(repoPath) {
    // Get Issue comments
    const data = await octokit.rest.repos.listForks({
      ...getOwnerRepo(repoPath),
    });

    return data.data
  }

  static async createComment(issueId, comment, repoPath) {
    // Create comment
    const data = await octokit.rest.issues.createComment({
      ...getOwnerRepo(repoPath),
      issue_number: issueId,
      body: comment,
    });

    return data.data;
  }

  static async createPullRequest(title, description, username, repoPath) {
    // Create pull request
    const repo = getOwnerRepo(repoPath).repo;
    const data = await octokit.rest.pulls.create({
      accept: 'application/vnd.github.v3+json',
      owner: ownerRepo.owner,
      repo,
      title,
      body: description,
      head: `${username}:${githubConfig.githubMainBranch}`,
      base: githubConfig.githubMainBranch,
      maintainer_can_modify: false,
      draft: false
    });

    return data.data;
  }

  static async mergePullRequest(pullRequestNumber, repoPath) {
    // Merge pull request
    const data = await octokit.rest.pulls.merge({
      ...getOwnerRepo(repoPath),
      pull_number: pullRequestNumber
    });

    return data.data;
  }

  static async getPullRequestCommits(pullRequestNumber, repoPath) {
    // Merge pull request
    const data = await octokit.rest.pulls.listCommits({
      ...getOwnerRepo(repoPath),
      pull_number: pullRequestNumber
    });

    return data.data;
  }

  static async getLastPullRequests(amount = 3) {
    // Get last N pull requests
    const filterMerged = ({merged_at}) => !!merged_at;
    const sortMerged = ({merged_at: a}, {merged_at: b}) =>
      ((a = new Date(a), b = new Date(b)), a > b ? -1 : a < b ? 1 : 0);

    return octokit.rest.pulls.list({
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      state: `closed`
    }).then((response) => response?.data?.filter(filterMerged).sort(sortMerged).slice(0, amount))
  }

  /**
   * Get last N months total commits, returns an object with JS timestamp and total of commits for that month
   * @example {Promise<{1627776000000: 1}>}
   */
  static async getLastCommits(months = 6) {
    if (githubRepoStats.lastUpdated && +new Date() - githubRepoStats.lastUpdated <= GITHUB_STATS_TTL)
      return githubRepoStats.data;

    const repos = [
      `bepro-js`,
      `web-network`,
      `microservice-github`,
      `landing-page`,
      `webapp-community`,
      `grants-program`,
      `bepro-telegram-bot`,
      `B.E.P.R.O`,
      `b2c-layout`,
      `ms-withdraw`,
      `backoffice`,
      `ms-master`,
      `scheduler-light`,
      `ms-rabbit-jackpot`,
      `listener-esports-data`,
      `ms-esports`,
      `esports-middleware`,
    ];

    const toDate = (timestamp) => +new Date(timestamp * 1000);

    const toDateObject = (p, {total = 0, week = 0}) =>
      ({...p, [toDate(week)]: (p[toDate(week)] || 0) + total});

    const backToObject = (p, [k, v]) => ({...p, [k]: v});

    const getCommitActivity = (repo) =>
      octokit.rest.repos.getCommitActivityStats({...ownerRepo, repo,}).then(mapData)

    return Promise.all(repos.map(getCommitActivity))
      .then(reposWeekly => reposWeekly.map(week => (week || []).reduce(toDateObject, {})))
      .then(reposMonthly => {

        const reduced = {};
        for (const repo of reposMonthly)
          for (const [k, v] of Object.entries(repo))
            reduced[k] = (reduced[k] || 0) + v;

        return reduced;
      }).then(reduced => {
        githubRepoStats.data = reduced;
        githubRepoStats.lastUpdated = +new Date();

        return reduced;
      })
  }

  static async getForkedRepo(ghhandler, repo){
    return octokit.rest.repos.get({repo: repo.split(`/`)[1], owner: ghhandler,})
      .then(({data}) => data)
      .catch((e) => {
        console.error(`Failed to get repos for ${ghhandler} ${repo}`, e.message);
        return null;
      })
  }

  static async getForksAmountFor(repo = ``) {
    const {data: forks} = await octokit.rest.repos.listForks({...ownerRepo, repo, per_page: 100,});
    const {data: stars} = await octokit.rest.activity.listStargazersForRepo({...ownerRepo, repo, per_page: 100,})
    const toLen = (array) =>  array.length > 99 ? `+99` : array.length.toString();

    return { repo, forks: toLen(forks), stars: toLen(stars), };
  }

  static async getForksOf(repos = []) {
    if (githubForkStats.lastUpdated && +new Date() - githubForkStats.lastUpdated <= GITHUB_STATS_TTL)
      return githubForkStats.data;

    const data = await Promise.all(repos.map(GithubService.getForksAmountFor))

    githubForkStats.lastUpdated = +new Date();
    githubForkStats.data = data;

    return data;
  }

  static rateLimit() {
    return octokit.request('GET /rate_limit')
  }

  static async getUser(username) {
    return octokit.rest.users.getByUsername({username})
      .then(({data}) => data)
      .catch(() => null);
  }

  static async repoExists(owner, repo) {
    return octokit.rest.repos.get({owner, repo})
      .then(({data}) => !!data?.id)
      .catch(e => {
        console.error(`Error checking for ${owner}/${repo} `)
        return false;
      });
  }
};
