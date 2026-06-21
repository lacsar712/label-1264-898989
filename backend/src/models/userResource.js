module.exports = (sequelize, DataTypes) => {
  const UserResource = sequelize.define(
    'UserResource',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: false },
      folderId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
      status: {
        type: DataTypes.ENUM('收藏', '待学', '学习中', '已完成'),
        allowNull: false,
        defaultValue: '收藏',
      },
      progressPercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      favoritedAt: { type: DataTypes.DATE, allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'user_resources',
      indexes: [{ unique: true, fields: ['user_id', 'resource_id'] }, { fields: ['folder_id'] }],
    }
  );

  return UserResource;
};
