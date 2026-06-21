module.exports = (sequelize, DataTypes) => {
  const Recommendation = sequelize.define(
    'Recommendation',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      batchId: { type: DataTypes.INTEGER, allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: false },
      adaptedTags: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      matchScore: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
      clickedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'recommendations',
    }
  );

  return Recommendation;
};
