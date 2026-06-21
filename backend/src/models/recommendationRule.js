module.exports = (sequelize, DataTypes) => {
  const RecommendationRule = sequelize.define(
    'RecommendationRule',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      ruleCode: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      matchDimensions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      weightRatio: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'recommendation_rules',
    }
  );

  return RecommendationRule;
};
