module.exports = (sequelize, DataTypes) => {
  const WrongQuestion = sequelize.define(
    'WrongQuestion',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      code: { type: DataTypes.STRING(32), allowNull: false },
      knowledgePoint: { type: DataTypes.STRING(128), allowNull: false },
      wrongCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      corrected: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      mastery: { type: DataTypes.ENUM('低', '中', '高'), allowNull: false, defaultValue: '低' },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'wrong_questions',
    }
  );

  return WrongQuestion;
};
