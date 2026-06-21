module.exports = (sequelize, DataTypes) => {
  const ResourceCategory = sequelize.define(
    'ResourceCategory',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      categoryCode: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      categoryName: { type: DataTypes.STRING(64), allowNull: false },
      parentCategory: { type: DataTypes.STRING(64), allowNull: false },
      subject: { type: DataTypes.STRING(32), allowNull: false },
      type: { type: DataTypes.ENUM('课程', '课件', '题库', '视频'), allowNull: false },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'resource_categories',
      indexes: [{ fields: ['subject', 'type'] }],
    }
  );

  return ResourceCategory;
};
