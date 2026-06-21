module.exports = (sequelize, DataTypes) => {
  const AssignmentSubmission = sequelize.define(
    'AssignmentSubmission',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      assignmentId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.ENUM('待完成', '进行中', '已提交', '已逾期'), allowNull: false, defaultValue: '待完成' },
      submittedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'assignment_submissions',
    }
  );

  return AssignmentSubmission;
};
