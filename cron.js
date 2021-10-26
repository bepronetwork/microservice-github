const CronJob = require('cron').CronJob;
const models = require('./models');
const { Op } = require('sequelize');
const GithubService = require('./services/github.service');
const dayjs = require('dayjs');

async function changeDraftedIssues() {
  console.log('##### Checking draft issues to move to open');
  const issues = await models.issue.findAll(
    {
      where: {
        createdAt: {
          [Op.lt]: dayjs().subtract(3, 'day').toDate(),
        },
        state: 'draft',
      },
    });

  for (const issue of issues) {
    try {
      const repo = await models.repositories.findOne({where: {id: issue.repository_id}})
      await GithubService.removeDraftLabelFromIssue(issue.githubId, repo?.githubPath);
    } catch (error) {
      // label not exists, ignoring
    }
    issue.state = 'open';
    await issue.save();
  }

  console.log('##### FINISH Checking draft issues to move to open');
}

try {
  console.log('Starting CronJob...');
  const stamp = +new Date();
  new CronJob({
    cronTime: '00 8 * * *',
    onTick: () => changeDraftedIssues(),
    start: true,
    timeZone: 'Europe/Lisbon'
  });

  console.log(`Started!`, +new Date() - stamp, `ms`);
  changeDraftedIssues();
} catch (ex) {
  console.log('cron pattern not valid');
}
