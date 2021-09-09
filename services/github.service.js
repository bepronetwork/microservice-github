const Octokit = require('octokit').Octokit;
const githubConfig = require('../config/github.config');
const octokit = new Octokit({ auth: githubConfig.githubToken });

const ownerRepo = {owner: githubConfig.githubOwner, repo: githubConfig.githubRepo,}
const mapData = ({data}) => data;

module.exports = class GithubService {

  static async createIssue(title, description) {
    // Create issue
    const data = await octokit.rest.issues.create({
      ...ownerRepo,
      title,
      body: description,
      labels: ['draft']
    });

    return data.data;
  }

  static async closeIssue(issueId) {
    // Close issue
    const data = await octokit.rest.issues.update({
      ...ownerRepo,
      issue_number: issueId,
      state: 'closed',
    });

    return data.data;
  }

  static async removeDraftLabelFromIssue(issueId) {
    // Remove Draft label from issue
    const data = await octokit.rest.issues.removeLabel({
      ...ownerRepo,
      issue_number: issueId,
      name: 'draft'
    });

    return data.data;
  }

  static async getIssueById(issueId) {
    // Get issue by id
    const data = await octokit.rest.issues.get({
      ...ownerRepo,
      issue_number: issueId,
    });

    return data.data
  }

  static async getIssueComments(issueId) {
    // Get Issue comments
    const data = await octokit.rest.issues.listComments({
      ...ownerRepo,
      issue_number: issueId,
    });

    return data.data
  }

  static async getIssueForks() {
    // Get Issue comments
    const data = await octokit.rest.repos.listForks({
      ...ownerRepo,
    });

    return data.data
  }

  static async createComment(issueId, comment) {
    // Create comment
    const data = await octokit.rest.issues.createComment({
      ...ownerRepo,
      issue_number: issueId,
      body: comment,
    });

    return data.data;
  }

  static async createPullRequest(title, description, username) {
    // Create pull request
    const data = await octokit.rest.pulls.create({
      accept: 'application/vnd.github.v3+json',
      ...ownerRepo,
      title,
      body: description,
      head: `${username}:${githubConfig.githubMainBranch}`,
      base: githubConfig.githubMainBranch,
      maintainer_can_modify: false,
      draft: false
    });

    return data.data;
  }

  static async mergePullRequest(pullRequestNumber) {
    // Merge pull request
    const data = await octokit.rest.pulls.merge({
      ...ownerRepo,
      pull_number: pullRequestNumber
    });

    return data.data;
  }

  static async getPullRequestCommits(pullRequestNumber) {
    // Merge pull request
    const data = await octokit.rest.pulls.listCommits({
      ...ownerRepo,
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
    const toDate = (timestamp) => new Date(timestamp * 1000).setDate(1);

    const toDateObject = (p, {total = 0, week = 0}) =>
      ({...p, [toDate(week)]: (p[toDate(week)] || 0) + total});

    const backToObject = (p, [k, v]) => ({...p, [k]: v});

    return octokit.rest.repos.getCommitActivityStats({...ownerRepo,})
      .then(mapData)
      .then(weeks => weeks.reduce(toDateObject, {}))
      .then(reduced =>
        Object.entries(reduced).slice(-months).reduce(backToObject, {}))
  }
};
