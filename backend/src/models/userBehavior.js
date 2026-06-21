module.exports = (sequelize, DataTypes) => {
  const UserBehavior = sequelize.define(
    'UserBehavior',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.ENUM('点击', '收藏', '学习'), allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: false },
      occurredAt: { type: DataTypes.DATE, allowNull: false },
      dwellSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'user_behaviors',
      indexes: [{ fields: ['user_id', 'occurred_at'] }],
    }
  );

  return UserBehavior;
};
