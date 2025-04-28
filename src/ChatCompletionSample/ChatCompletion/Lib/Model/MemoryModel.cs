using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;

namespace ChatCompletion.Lib.Model;

public class MemoryModel
{
    public string? Model { get; set; }

    public string? Title { get; set; }

    public string ThreadId { get; set; } = default!;

    public IList<MessageModel> Messages { get; set; } = [];

    public class MessageModel
    {
        public string Id { get; set; } = default!;

        public int Version { get; set; }

        public int ResponseTimeMills { get; set; }

        public MessageType Type { get; set; } = MessageType.Assistant;

        public string? Model { get; set; }

        public string? Message { get; set; }

        public IList<InlineDataModel> InlineData { get; set; } = [];
    }

    public class InlineDataModel
    {
        public InlineDataType Type { get; set; }

        public required string Uri { get; set; }
    }

    public enum MessageType
    {
        System = 1,
        Assistant = 2,
        User = 4
    }

    public enum InlineDataType
    {
        Image = 1
    }

    private static readonly JsonSerializerOptions jsonSerializerOptions = new()
    {
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All)
    };

    public static Task Serialize(MemoryModel memoryModel, Stream output)
    {
        return JsonSerializer.SerializeAsync(output, memoryModel, jsonSerializerOptions);
    }

    public static ValueTask<MemoryModel?> DeserializeAsync(Stream input)
    {
        return JsonSerializer.DeserializeAsync<MemoryModel>(input, jsonSerializerOptions);
    }
}
