import { Octokit } from 'octokit';
const githubConfig = require('../config/github');
const octokit = new Octokit({ auth: githubConfig.githubToken });

module.exports = class GithubService {

  static async createIssue(title, body) {
    // Create issue
    const data = await octokit.rest.issues.create({
      owner: githubConfig.githubOwner,
      repo: githubConfig.githubRepo,
      title,
      body,
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
};