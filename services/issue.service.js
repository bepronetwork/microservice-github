const GithubService = require('./github.service');
const githubConfig = require('../config/github.config');

const dCache = {}
const TTL = 60 * 1000;

module.exports = class IssueService {

  static async getIssueData(issue) {
    if (dCache[issue.githubId]?.lastUpdated && +new Date() - dCache[issue.githubId]?.lastUpdated <= TTL)
      return dCache[issue.githubId];

    const githubIssue = await GithubService.getIssueById(issue.githubId);

    const issueData = {
      lastUpdated: +new Date(),
      issueId: issue.issueId,
      githubId: issue.githubId,
      createdAt: issue.createdAt,
      state: issue.state,
      creatorAddress: issue.creatorAddress,
      creatorGithub: issue.creatorGithub,
      amount: issue.amount,
      title: githubIssue.title,
      body: githubIssue.body,
      numberOfComments: githubIssue.comments,
      developers: issue.developers,
      pullRequests: issue.pullRequests,
      mergeProposals: issue.mergeProposals,
      repo: githubConfig.githubRepo
    }

    dCache[issue.githubId] = issueData;

    return issueData;
  }

  static async getIssuesData(issues) {
    const githubIssues = await GithubService.getAllIssues();
    const getGithubIssue = (issue) => (githubIssues || []).find(i => i.number === +issue.githubId);

    const mergeIssueData = (issue) => {
      const githubIssue = getGithubIssue(issue);
      if (!githubIssue || !issue?.issueId)
        return null;
      return ({...issue, title: githubIssue?.title, body: githubIssue?.body, numberOfComments: githubIssue?.comments, repo: githubConfig.githubRepo});
    }

    return issues.map(mergeIssueData).filter(issue => !!issue);
  }
};
