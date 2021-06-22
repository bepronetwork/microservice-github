'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PullRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      models.developer.belongsTo(models.issue, {
        foreignKey: 'issueId',
        sourceKey: 'id'
      });
    }
  };
  PullRequest.init({
    githubId: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'pullRequest',
    tableName: 'pull_requests',
  });
  return PullRequest;
};