module.exports = (sequelize, DataTypes) => {
  const Flashcard = sequelize.define(
    'Flashcard',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      sourceType: { type: DataTypes.ENUM('wrong_question', 'resource_tag'), allowNull: false },
      sourceId: { type: DataTypes.INTEGER, allowNull: false },
      front: { type: DataTypes.TEXT, allowNull: false },
      back: { type: DataTypes.TEXT, allowNull: false },
      intervalDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      easeFactor: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 1.5 },
      nextReviewAt: { type: DataTypes.DATE, allowNull: false },
      reviewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      correctCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'flashcards',
    }
  );

  return Flashcard;
};
