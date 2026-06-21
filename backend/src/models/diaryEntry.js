module.exports = (sequelize, DataTypes) => {
  const DiaryEntry = sequelize.define(
    'DiaryEntry',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      mood: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3, validate: { min: 1, max: 5 } },
      harvest: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      plan: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    },
    {
      tableName: 'diary_entry',
      indexes: [
        { fields: ['user_id'] },
        { unique: true, fields: ['user_id', 'date'] },
      ],
    }
  );

  return DiaryEntry;
};
