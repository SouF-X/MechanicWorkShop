using System.Security.Claims;

namespace MechanicShop.Application.Features.Identity.Dtos;

public sealed record AppUserDto(
    string UserId,
    string Email,
    IList<string> Roles,
    IList<Claim> Claims,
    string? FirstName = null,
    string? LastName = null,
    string? Name = null,
    string? Role = null);