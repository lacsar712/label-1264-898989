module.exports = (sequelize, DataTypes) => {
  const FlashcardReview = sequelize.define(
    'FlashcardReview',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      flashcardId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      result: { type: DataTypes.ENUM('remembered', 'forgot'), allowNull: false },
    },
    {
      tableName: 'flashcard_reviews',
    }
  );

  return FlashcardReview;
};
