const CronJob = require('cron').CronJob;
const models = require('./models');
const { Op } = require('sequelize');
const GithubService = require('./services/github.service');
const dayjs = require('dayjs');

try {
  console.log('Starting CronJob...');
  const stamp = +new Date();
  new CronJob({
    cronTime: '00 0 8 * * *',
    onTick: async () => {
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
          await GithubService.removeDraftLabelFromIssue(issue.githubId);
        } catch (error) {
          // label not exists, ignoring
        }
        issue.state = 'open';
        await issue.save();
      }

      console.log('##### FINISH Checking draft issues to move to open');
    },
    start: true,
    timeZone: 'Europe/Lisbon'
  });

  console.log(`Started!`, +new Date() - stamp, `ms`);
} catch (ex) {
  console.log('cron pattern not valid');
}
