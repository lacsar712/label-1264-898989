module.exports = (sequelize, DataTypes) => {
  const FocusSession = sequelize.define(
    'FocusSession',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      resourceId: { type: DataTypes.INTEGER, allowNull: true },
      resourceName: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
      presetId: { type: DataTypes.INTEGER, allowNull: true },
      presetName: { type: DataTypes.STRING(64), allowNull: false, defaultValue: '' },
      focusMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 25 },
      breakMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      actualFocusSeconds: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: '进行中' },
      summary: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
      startedAt: { type: DataTypes.DATE, allowNull: false },
      endedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'focus_session',
      indexes: [
        { fields: ['user_id'] },
        { fields: ['user_id', 'started_at'] },
      ],
    }
  );

  return FocusSession;
};
