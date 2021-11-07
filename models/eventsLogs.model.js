'use strict';
const {Model} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EventsLogsModel extends Model {

    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
    }
  }

  EventsLogsModel.init({
    id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, unique: true},
    event_name: {
      type: DataTypes.STRING
    },
    lastBlockNumber: {
      type: DataTypes.INTEGER
    },
  }, {
    sequelize,
    modelName: 'eventsLogs',
    tableName: 'events_logs',
    timestamps: false,
  });


  return EventsLogsModel;
};
