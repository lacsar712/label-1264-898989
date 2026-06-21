module.exports = (sequelize, DataTypes) => {
  const FocusPreset = sequelize.define(
    'FocusPreset',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(64), allowNull: false },
      focusMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 25 },
      breakMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'focus_preset',
      indexes: [{ fields: ['user_id'] }],
    }
  );

  return FocusPreset;
};
