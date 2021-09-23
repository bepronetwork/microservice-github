const GithubService = require('./github.service');

const dCache = {}
const TTL = 60 * 1000;

module.exports = class IssueService {

  static async getIssueData(issue) {
    if (dCache[issue.githubId]?.ttl && +new Date() - dCache[issue.githubId]?.ttl <= TTL)
      return dCache[issue.githubId];

    const githubIssue = await GithubService.getIssueById(issue.githubId);

    const issueData = {
      ttl: +new Date() + TTL,
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
    }

    dCache[issue.githubId] = issueData;

    return issueData;
  }

  static async getIssuesData(issues) {
    const githubIssues = await GithubService.getAllIssues();
    const getGithubIssue = (issue) => (githubIssues || []).find(i => i.number === +issue.githubId);

    const mergeIssueData = (issue) => {
      const githubIssue = getGithubIssue(issue);
      if (!githubIssue)
        return null;
      return ({...issue, title: githubIssue?.title, body: githubIssue?.body, numberOfComments: githubIssue?.comments});
    }

    return issues.map(mergeIssueData).filter(issue => !!issue);
  }
};
