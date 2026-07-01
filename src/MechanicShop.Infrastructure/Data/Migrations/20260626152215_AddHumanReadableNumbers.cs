using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MechanicShop.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHumanReadableNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence<int>(
                name: "InvoiceNumberSequence");

            migrationBuilder.CreateSequence<int>(
                name: "WorkOrderNumberSequence");

            migrationBuilder.AddColumn<string>(
                name: "WorkOrderNumber",
                table: "WorkOrders",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvoiceNumber",
                table: "Invoices",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.Sql("""
                WITH OrderedWorkOrders AS
                (
                    SELECT Id, ROW_NUMBER() OVER (ORDER BY CreatedAtUtc, Id) AS Number
                    FROM WorkOrders
                )
                UPDATE wo
                SET WorkOrderNumber = 'WO-' + RIGHT('000000' + CONVERT(varchar(6), owo.Number), 6)
                FROM WorkOrders wo
                INNER JOIN OrderedWorkOrders owo ON owo.Id = wo.Id;
                """);

            migrationBuilder.Sql("""
                WITH OrderedInvoices AS
                (
                    SELECT Id, ROW_NUMBER() OVER (ORDER BY IssuedAtUtc, Id) AS Number
                    FROM Invoices
                )
                UPDATE i
                SET InvoiceNumber = 'INV-' + RIGHT('000000' + CONVERT(varchar(6), oi.Number), 6)
                FROM Invoices i
                INNER JOIN OrderedInvoices oi ON oi.Id = i.Id;
                """);

            migrationBuilder.Sql("""
                DECLARE @nextWorkOrderNumber bigint = (
                    SELECT ISNULL(MAX(CONVERT(int, RIGHT(WorkOrderNumber, 6))), 0) + 1
                    FROM WorkOrders
                    WHERE WorkOrderNumber IS NOT NULL
                );
                DECLARE @workOrderSequenceSql nvarchar(max) = N'ALTER SEQUENCE [WorkOrderNumberSequence] RESTART WITH ' + CONVERT(nvarchar(20), @nextWorkOrderNumber);
                EXEC sp_executesql @workOrderSequenceSql;
                """);

            migrationBuilder.Sql("""
                DECLARE @nextInvoiceNumber bigint = (
                    SELECT ISNULL(MAX(CONVERT(int, RIGHT(InvoiceNumber, 6))), 0) + 1
                    FROM Invoices
                    WHERE InvoiceNumber IS NOT NULL
                );
                DECLARE @invoiceSequenceSql nvarchar(max) = N'ALTER SEQUENCE [InvoiceNumberSequence] RESTART WITH ' + CONVERT(nvarchar(20), @nextInvoiceNumber);
                EXEC sp_executesql @invoiceSequenceSql;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "WorkOrderNumber",
                table: "WorkOrders",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValueSql: "'WO-' + RIGHT('000000' + CONVERT(varchar(6), NEXT VALUE FOR [WorkOrderNumberSequence]), 6)",
                oldClrType: typeof(string),
                oldType: "nvarchar(16)",
                oldMaxLength: 16,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "InvoiceNumber",
                table: "Invoices",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValueSql: "'INV-' + RIGHT('000000' + CONVERT(varchar(6), NEXT VALUE FOR [InvoiceNumberSequence]), 6)",
                oldClrType: typeof(string),
                oldType: "nvarchar(16)",
                oldMaxLength: 16,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_WorkOrderNumber",
                table: "WorkOrders",
                column: "WorkOrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_InvoiceNumber",
                table: "Invoices",
                column: "InvoiceNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorkOrders_WorkOrderNumber",
                table: "WorkOrders");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_InvoiceNumber",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "WorkOrderNumber",
                table: "WorkOrders");

            migrationBuilder.DropColumn(
                name: "InvoiceNumber",
                table: "Invoices");

            migrationBuilder.DropSequence(
                name: "InvoiceNumberSequence");

            migrationBuilder.DropSequence(
                name: "WorkOrderNumberSequence");
        }
    }
}
