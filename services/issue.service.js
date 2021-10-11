const GithubService = require('./github.service');
const githubConfig = require('../config/github.config');
const models = require('../models')
const TTL = 60 * 1000;

module.exports = class IssueService {

  static async getIssueData(issue) {

    const githubIssue = await GithubService.getIssueById(issue.githubId);

    const issueData = {
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

    return issueData;
  }

  static async getIssuesData(issues) {

    const mergeIssueData = async (issue) => {
      const issueCache = await models.cache.findOne({
        where:{
          key: issue?.githubId,
        }
      })
      
      if(issueCache && +new Date() - issueCache?.updatedAt <= TTL){
        return issueCache.data;
      }

      const githubIssue = await IssueService.getIssueData(issue);
      
      if (!githubIssue)
        return null;

      const data = ({...issue, title: githubIssue?.title, body: githubIssue?.body, numberOfComments: githubIssue?.comments, repo: githubConfig.githubRepo});
      
      if(issueCache){
        issueCache.data = data;
        issueCache.updatedAt = +new Date();
        issueCache.save()
      }
      else{
        await models.cache.create({
          key: issue?.githubId,
          data: data,
          updatedAt: +new Date()
        })
      }

      return data;
    }

    return Promise.all(issues.map(mergeIssueData).filter(issue => !!issue))
      .catch(e => {
        console.log(`Error fetching issues data`, e);
        return [];
      });
  }
};
