module.exports = (sequelize, DataTypes) => {
  const FavoriteFolder = sequelize.define(
    'FavoriteFolder',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(64), allowNull: false },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      parentId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'favorite_folders',
      indexes: [{ fields: ['user_id', 'sort_order'] }],
    }
  );

  return FavoriteFolder;
};
