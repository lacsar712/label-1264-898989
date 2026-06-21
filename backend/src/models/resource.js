module.exports = (sequelize, DataTypes) => {
  const Resource = sequelize.define(
    'Resource',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(32), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      subject: { type: DataTypes.STRING(32), allowNull: false },
      type: { type: DataTypes.ENUM('课程', '课件', '题库', '视频'), allowNull: false },
      difficulty: { type: DataTypes.ENUM('基础', '提高', '挑战'), allowNull: false },
      heat: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      rating: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
      estimatedHours: { type: DataTypes.DECIMAL(5, 1), allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.ENUM('上架', '下架', '审核中'), allowNull: false, defaultValue: '上架' },
      deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      uploadedAt: { type: DataTypes.DATE, allowNull: false },
    },
    {
      tableName: 'resources',
    }
  );

  return Resource;
};
