module.exports = (sequelize, DataTypes) => {
  const LearningGoal = sequelize.define(
    'LearningGoal',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.ENUM('日', '周', '月'), allowNull: false },
      targetMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      targetResources: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: { type: DataTypes.DATEONLY, allowNull: false },
      currentMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      currentResources: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      adjustmentRecord: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    },
    {
      tableName: 'learning_goals',
    }
  );

  return LearningGoal;
};
