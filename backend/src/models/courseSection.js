module.exports = (sequelize, DataTypes) => {
  const CourseSection = sequelize.define(
    'CourseSection',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      chapterId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'course_sections',
      indexes: [{ fields: ['chapter_id'] }],
    }
  );

  return CourseSection;
};
