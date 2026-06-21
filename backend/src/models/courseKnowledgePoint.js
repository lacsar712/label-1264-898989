module.exports = (sequelize, DataTypes) => {
  const CourseKnowledgePoint = sequelize.define(
    'CourseKnowledgePoint',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      sectionId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'course_knowledge_points',
      indexes: [{ fields: ['section_id'] }],
    }
  );

  return CourseKnowledgePoint;
};
