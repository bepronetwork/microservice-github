const GithubService = require('./github.service');
const githubConfig = require('../config/github.config');
const models = require(`../models`);

const dCache = {}
const TTL = 60 * 1000;

function getId(issue) {
  return issue?.issueId || [issue.repository_id, issue.githubId].join(`/`)
}

module.exports = class IssueService {

  static async getIssueData(issue) {
    const iid = getId(issue);
    if (dCache[iid]?.lastUpdated && +new Date() - dCache[iid]?.lastUpdated <= TTL)
      return dCache[iid];

    let repoPath = issue?.repo || (await models.repositories.findOne({where: {id: issue.repository_id}}))?.githubPath;

    const githubIssue = await GithubService.getIssueById(issue.githubId, repoPath);
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
    }

    dCache[iid] = issueData;

    return issueData;
  }

  static async getIssuesData(issues) {

    const mergeIssueData = async (issue) => {
      const githubIssue = await IssueService.getIssueData(issue);
      if (!githubIssue)
        return null;
      return ({...issue, title: githubIssue?.title, body: githubIssue?.body, numberOfComments: githubIssue?.numberOfComments,});
    }

    return Promise.all(issues.map(mergeIssueData).filter(issue => !!issue))
      .catch(e => {
        console.log(`Error fetching issues data`, e);
        return [];
      });
  }
};
