module.exports = (sequelize, DataTypes) => {
  const UserLearningProgress = sequelize.define(
    'UserLearningProgress',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      knowledgePointId: { type: DataTypes.INTEGER, allowNull: false },
      learned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      learnedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    },
    {
      tableName: 'user_learning_progress',
      indexes: [
        { unique: true, fields: ['user_id', 'knowledge_point_id'] },
        { fields: ['user_id'] },
      ],
    }
  );

  return UserLearningProgress;
};
