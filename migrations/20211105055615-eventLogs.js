'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('events_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      event_name: {
        type: Sequelize.STRING
      },
      lastBlockNumber: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        type: Sequelize.DATE,
        default: new Date()
      },
      updatedAt: {
        type: Sequelize.DATE,
        default: new Date()
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('events_logs');
  }
};
