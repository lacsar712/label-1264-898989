module.exports = (sequelize, DataTypes) => {
  const SystemLog = sequelize.define(
    'SystemLog',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      actorUserId: { type: DataTypes.INTEGER, allowNull: true },
      type: { type: DataTypes.STRING(64), allowNull: false },
      content: { type: DataTypes.STRING(255), allowNull: false },
      ip: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
      status: { type: DataTypes.ENUM('成功', '失败'), allowNull: false, defaultValue: '成功' },
    },
    {
      tableName: 'system_logs',
    }
  );

  return SystemLog;
};
