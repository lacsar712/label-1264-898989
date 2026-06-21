module.exports = (sequelize, DataTypes) => {
  const CourseChapter = sequelize.define(
    'CourseChapter',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      resourceId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'course_chapters',
      indexes: [{ fields: ['resource_id'] }],
    }
  );

  return CourseChapter;
};
