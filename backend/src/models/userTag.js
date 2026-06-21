module.exports = (sequelize, DataTypes) => {
  const UserTag = sequelize.define(
    'UserTag',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(64), allowNull: false },
      category: { type: DataTypes.STRING(32), allowNull: false },
      weight: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
    },
    {
      tableName: 'user_tags',
    }
  );

  return UserTag;
};
