using ChatCompletion.SemanticKernelLib.Model;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;

namespace ChatCompletion.SemanticKernelLib.Extensions;

public static class MemoryModelExtensions
{
    public static ChatHistory ToChatHistory(this MemoryModel memoryModel)
    {
        var history = new ChatHistory();
        foreach (var message in memoryModel.Messages)
        {
            var items = new ChatMessageContentItemCollection
            {
                new TextContent(message.Message)
            };
            foreach (var inlineData in message.InlineData)
            {
                switch (inlineData.Type)
                {
                    case MemoryModel.InlineDataType.Image:
                        items.Add(new ImageContent(inlineData.Uri));
                        break;
                }
            }
            switch (message.Type)
            {
                case MemoryModel.MessageType.System:
                    history.AddMessage(AuthorRole.System, items);
                    break;
                case MemoryModel.MessageType.Assistant:
                    history.AddMessage(AuthorRole.Assistant, items);
                    break;
                case MemoryModel.MessageType.User:
                    history.AddMessage(AuthorRole.User, items);
                    break;
            }
        }
        return history;
    }
}
