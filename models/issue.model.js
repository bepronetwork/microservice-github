'use strict';

module.exports = (sequelize, DataTypes) => {
  const issue = sequelize.define('issue', {
    issueId: DataTypes.INTEGER,
    githubId: DataTypes.STRING,
    state: DataTypes.STRING,
  }
  );

  return issue;
};
