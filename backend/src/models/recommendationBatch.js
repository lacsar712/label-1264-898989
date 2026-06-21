module.exports = (sequelize, DataTypes) => {
  const RecommendationBatch = sequelize.define(
    'RecommendationBatch',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      batchCode: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      resourceCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      clickCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      completeCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      completionRate: { type: DataTypes.DECIMAL(6, 3), allowNull: false, defaultValue: 0 },
      reviewNote: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
    },
    {
      tableName: 'recommendation_batches',
    }
  );

  return RecommendationBatch;
};
