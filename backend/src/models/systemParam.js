module.exports = (sequelize, DataTypes) => {
  const SystemParam = sequelize.define(
    'SystemParam',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      paramCode: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      value: { type: DataTypes.STRING(128), allowNull: false },
      defaultValue: { type: DataTypes.STRING(128), allowNull: false },
      updatedBy: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'system' },
    },
    {
      tableName: 'system_params',
    }
  );

  return SystemParam;
};
