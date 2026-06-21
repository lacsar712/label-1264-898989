module.exports = (sequelize, DataTypes) => {
  const ResourceTag = sequelize.define(
    'ResourceTag',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      resourceId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(64), allowNull: false },
      stage: { type: DataTypes.STRING(32), allowNull: false },
      weight: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
    },
    {
      tableName: 'resource_tags',
    }
  );

  return ResourceTag;
};
