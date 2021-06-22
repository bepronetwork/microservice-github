const Octokit = require('octokit').Octokit;
const githubConfig = require('../config/github.config');
const octokit = new Octokit({ auth: githubConfig.githubToken });

module.exports = class GithubService {

  static async createIssue(title, description) {
    // Create issue
    const data = await octokit.rest.issues.create({
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      title,
      body: description,
      labels: ['draf']
    });

    return data.data;
  }

  static async getIssueById(issueId) {
    // Get issue by id
    const data = await octokit.rest.issues.get({
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      issue_number: issueId,
    });

    return data.data
  }

  static async getIssueComments(issueId) {
    // Get Issue comments
    const data = await octokit.rest.issues.listComments({
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      issue_number: issueId,
    });

    return data.data
  }

  static async createComment(issueId, comment) {
    // Create comment
    const data = await octokit.rest.issues.createComment({
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      issue_number: issueId,
      body: comment,
    });

    return data.data;
  }

  static async createPullRequest(title, description, username) {
    // Create pull request
    const data = await octokit.rest.pulls.create({
      accept: 'application/vnd.github.v3+json',
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      title,
      body: description,
      head: `${username}:${githubConfig.githubMainBranch}`,
      base: githubConfig.githubMainBranch,
      maintainer_can_modify: false,
      draft: false
    });

    return data.data;
  }
};