module.exports = (sequelize, DataTypes) => {
  const LearningReport = sequelize.define(
    'LearningReport',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      periodStart: { type: DataTypes.DATEONLY, allowNull: false },
      periodEnd: { type: DataTypes.DATEONLY, allowNull: false },
      periodType: { type: DataTypes.ENUM('周', '月', '学期', '自定义'), allowNull: false, defaultValue: '月' },
      title: { type: DataTypes.STRING(128), allowNull: false },
      status: { type: DataTypes.ENUM('生成中', '已完成', '失败'), allowNull: false, defaultValue: '生成中' },
      progress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      progressMessage: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
      archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      generatedBy: { type: DataTypes.INTEGER, allowNull: true },
      generatedAt: { type: DataTypes.DATE, allowNull: true },
      summary: { type: DataTypes.JSON, allowNull: true },
      learningDurationTrend: { type: DataTypes.JSON, allowNull: true },
      subjectCompletion: { type: DataTypes.JSON, allowNull: true },
      recommendationHitRate: { type: DataTypes.JSON, allowNull: true },
      wrongQuestionDistribution: { type: DataTypes.JSON, allowNull: true },
      periodComparison: { type: DataTypes.JSON, allowNull: true },
      htmlContent: { type: DataTypes.TEXT('long'), allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'learning_reports',
      indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'period_start', 'period_end'] },
        { fields: ['status'] },
        { fields: ['archived'] },
      ],
    }
  );

  return LearningReport;
};
