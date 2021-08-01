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
      labels: ['draft']
    });

    return data.data;
  }

  static async closeIssue(issueId) {
    // Close issue
    const data = await octokit.rest.issues.update({
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      issue_number: issueId,
      state: 'closed',
    });

    return data.data;
  }

  static async removeDraftLabelFromIssue(issueId) {
    // Remove Draft label from issue
    const data = await octokit.rest.issues.removeLabel({
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      issue_number: issueId,
      name: 'draft'
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

  static async mergePullRequest(pullRequestNumber) {
    // Merge pull request
    const data = await octokit.rest.pulls.merge({
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      pull_number: pullRequestNumber
    });

    return data.data;
  }
};