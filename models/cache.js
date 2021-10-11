'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Cache extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  Cache.init({
    key: DataTypes.STRING,
    data: {
      type: DataTypes.JSON,
      allowNull: false,
      get() {
        return JSON.parse(this.getDataValue("data"));
      }, 
      set(value) {
        return this.setDataValue("data", JSON.stringify(value));
      }
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }},{
    sequelize,
    modelName: 'cache',
    tableName: "cache"
  });
  return Cache;
};