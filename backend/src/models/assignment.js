module.exports = (sequelize, DataTypes) => {
  const Assignment = sequelize.define(
    'Assignment',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING(128), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      deadline: { type: DataTypes.DATE, allowNull: false },
      resourceIds: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      targetScope: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
      createdBy: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      tableName: 'assignments',
    }
  );

  return Assignment;
};
