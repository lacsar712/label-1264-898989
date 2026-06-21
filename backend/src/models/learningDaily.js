module.exports = (sequelize, DataTypes) => {
  const LearningDaily = sequelize.define(
    'LearningDaily',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      subject: { type: DataTypes.STRING(32), allowNull: false },
      studyMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      completedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      avgMatchScore: { type: DataTypes.DECIMAL(6, 3), allowNull: false, defaultValue: 0 },
      targetAchieveRate: { type: DataTypes.DECIMAL(6, 3), allowNull: false, defaultValue: 0 },
      note: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    },
    {
      tableName: 'learning_daily',
      indexes: [{ fields: ['user_id', 'date'] }],
    }
  );

  return LearningDaily;
};
